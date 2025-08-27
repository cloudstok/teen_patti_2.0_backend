import { updateBalanceFromAccount } from '../../utilities/common-function';
import { addSettleBet, insertBets } from './bets-db';
import { appConfig } from '../../utilities/app-config';
import { setCache, getCache } from '../../utilities/redis-connection';
import { getBetResult, getUserIP, logEventAndEmitResponse } from '../../utilities/helper-function';
import { createLogger } from '../../utilities/logger';
import { Server, Socket } from 'socket.io';
import { BetObject, BetResult, IResult, LobbiesData, SingleBetData } from '../../interfaces';
import { read } from '../../utilities/db-connection';
const logger = createLogger('Bets', 'jsonl');
const settlBetLogger = createLogger('Settlement', 'jsonl');

let lobbyData: LobbiesData = { lobbyId: 0, status: 0 };
let roundBets: BetObject[] = [];

export const setCurrentLobby = (data: LobbiesData) => {
    lobbyData = data;
};

export const placeBet = async (socket: Socket, betData: [string, string]) => {
    const playerDetails = await getCache(`PL:${socket.id}`);
    if (!playerDetails) {
        return socket.emit('message', { eventName: 'betError', data: { message: 'Invalid Player Details', status: false } });
    }

    const parsedPlayerDetails = JSON.parse(playerDetails);
    const { userId, operatorId, token, game_id, balance } = parsedPlayerDetails;
    const lobbyId = Number(betData[0]);
    const userBets = betData[1].split(',');
    const bet_id = `BT:${lobbyId}:${userId}:${operatorId}`;
    const betObj: BetObject = { bet_id, token, socket_id: parsedPlayerDetails.socketId, game_id, lobby_id: lobbyId };

    if (lobbyData.lobbyId !== lobbyId || lobbyData.status !== 1) {
        return logEventAndEmitResponse(socket, betObj, 'Betting Closed', 'bet');
    }

    let totalBetAmount = 0;
    let isBetInvalid = 0;
    const bets: SingleBetData[] = [];

    userBets.forEach((bet) => {
        const [chipStr, betAmountStr] = bet.split('-');
        const betAmount = Number(betAmountStr);
        const chip = Number(chipStr);
        const data: SingleBetData = { betAmount, chip };

        if (betAmount <= 0 ||
            betAmount < appConfig.minBetAmount ||
            betAmount > appConfig.maxBetAmount) isBetInvalid = 1;

        totalBetAmount += betAmount;
        bets.push(data);
    });

    if (isBetInvalid || (totalBetAmount > appConfig.maxBetAmount)) {
        return logEventAndEmitResponse(socket, betObj, 'Invalid Bet Amount', 'bet');
    }

    if (totalBetAmount > Number(balance)) {
        return logEventAndEmitResponse(socket, betObj, 'Insufficient Balance', 'bet');
    }

    const chips = bets.map(bet => bet.chip)
    if (chips.length > 4) {
        return logEventAndEmitResponse(socket, betObj, 'Invalid Bet Size', 'bet');
    }

    if (chips.includes(1) && chips.includes(2)) {
        return logEventAndEmitResponse(socket, betObj, 'Invalid Bet: Choose A or B', 'bet');
    }

    if (chips.some(chip => chip > 5)) {
        return logEventAndEmitResponse(socket, betObj, 'Invalid Bet Choice', 'bet');
    }

    const ip = getUserIP(socket);

    Object.assign(betObj, {
        bet_amount: totalBetAmount,
        userBets: bets,
        ip
    });

    const webhookData = await updateBalanceFromAccount({
        id: lobbyData.lobbyId,
        bet_amount: totalBetAmount,
        game_id,
        bet_id,
        ip,
        user_id: userId
    }, "DEBIT", { game_id, operatorId, token });

    if (!webhookData.status) return socket.emit("betError", "Bet Cancelled By Upstream Server");
    if (webhookData.txn_id) betObj.txn_id = webhookData.txn_id;

    roundBets.push(betObj);
    logger.info(JSON.stringify({ betObj }));

    await insertBets({
        totalBetAmount,
        bet_id,
        userBets: betObj.userBets!
    });

    parsedPlayerDetails.balance = Number(balance - totalBetAmount).toFixed(2);
    await setCache(`PL:${socket.id}`, JSON.stringify(parsedPlayerDetails));

    socket.emit("info", {
        userId,
        operator_id: operatorId,
        balance: parsedPlayerDetails.balance
    });

    return socket.emit("bet", { message: "Bet Placed Successfully" });
};

export const settleBet = async (io: Server, result: IResult, lobbyId: number): Promise<void> => {
    try {

        if (roundBets.length > 0) {
            const bets = roundBets;
            const settlements = [];

            for (const betData of bets) {
                const { bet_id, socket_id, game_id, lobby_id, txn_id, userBets, ip, token } = betData;
                const [_, __, user_id, operator_id] = bet_id.split(':');
                let finalAmount = 0;
                let totalMultiplier = 0;
                let totalBetAmount = 0;
                const betResults: BetResult[] = [];

                userBets?.forEach(({ betAmount, chip }) => {
                    totalBetAmount += betAmount;
                    const roundResult = getBetResult(betAmount, chip, result);
                    const winAmount = roundResult.winAmount
                    const profit = winAmount - betAmount
                    betResults.push({ profit, ...roundResult });

                    if (roundResult.mult > 0) {
                        totalMultiplier += roundResult.status == 'Win' ? roundResult.mult : 0;
                        finalAmount = Number(finalAmount) + winAmount
                    }
                });

                settlements.push({
                    bet_id: betData.bet_id,
                    totalBetAmount: totalBetAmount,
                    userBets: betResults,
                    result,
                    totalMaxMult: totalMultiplier > 0 ? totalMultiplier : 0.00,
                    winAmount: finalAmount > 0 ? finalAmount : 0.00
                });

                settlBetLogger.info(JSON.stringify({ betData, finalAmount, result, totalMultiplier }));
                let finalBetResult;
                if (finalAmount > 0) {
                    const winAmount = Math.min(finalAmount, appConfig.maxCashoutAmount).toFixed(2)
                    const webhookData = await updateBalanceFromAccount({ user_id, winning_amount: winAmount, id: lobbyId, game_id, txn_id: txn_id, ip }, 'CREDIT', { game_id, operatorId: operator_id, token });
                    if (!webhookData.status) console.error('Credit Txn Failed');

                    const cachedPlayerDetails = await getCache(`PL:${socket_id}`);

                    if (cachedPlayerDetails) {
                        const parsedPlayerDetails = JSON.parse(cachedPlayerDetails);
                        parsedPlayerDetails.balance = Number(Number(parsedPlayerDetails.balance) + finalAmount).toFixed(2);
                        await setCache(`PL:${socket_id}`, JSON.stringify(parsedPlayerDetails));
                        setTimeout(() => {
                            io.to(socket_id).emit("info",
                                {
                                    user_id,
                                    operator_id,
                                    balance: parsedPlayerDetails.balance
                                });
                        }, 200);
                    }

                    finalBetResult = betResults.map((bet) => ({
                        ...bet,
                        betAmount: Number(bet.betAmount).toFixed(2),
                        winAmount: Number(bet.winAmount).toFixed(2),
                        mult: Number(bet.mult).toFixed(2)
                    }));


                    io.to(socket_id).emit('settlement', { message: `You Win ${winAmount}`, mywinningAmount: winAmount, status: 'WIN', roundResult: result, finalBetResult, lobby_id });
                } else {
                    io.to(socket_id).emit('settlement', { message: `You Loss ${totalBetAmount.toFixed(2)}`, lossAmount: totalBetAmount.toFixed(2), status: 'LOSS', roundResult: result, finalBetResult, lobby_id });
                }

            }

            await addSettleBet(settlements);
            roundBets.length = 0;
        }

    } catch (error) {
        console.error('Error settling bets:', error);
    }
};

