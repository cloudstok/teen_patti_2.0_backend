import { BetResult, IResult } from '../interfaces';
import { appConfig } from './app-config';
import { createLogger } from './logger';
import { Socket } from 'socket.io';

const failedBetLogger = createLogger('failedBets', 'jsonl');

export const logEventAndEmitResponse = (
    socket: Socket,
    req: any,
    res: string,
    event: string
): void => {
    const logData = JSON.stringify({ req, res });
    if (event === 'bet') {
        failedBetLogger.error(logData);
    }
    socket.emit('betError', { message: res, status: false });
};

export const getUserIP = (socket: any): string => {
    const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        if (ip) return ip;
    }
    return socket.handshake.address || '';
};


export const getBetResult = (betAmount: number, chip: number, result: IResult): BetResult => {
    const resultData: BetResult = {
        chip,
        betAmount,
        winAmount: 0,
        mult: 0,
        status: 'loss'
    };

    const bonusHand = result.bonusHand.handType
    const playerWinner = result.winner;
    const playerAHandType = result.playerAHandType.handType;
    const playerBHandType = result.playerBHandType.handType;

    const playerPayouts: Record<number, number> = {
        1: 1.92,
        2: 1.92,
    }

    const pairPlusPayouts: Record<string,number> = {
        'pair': 2,
        'flush': 4,
        'straight': 7,
        'straight_flush': 31,
        'three_of_a_kind': 41,
        'three_of_kind_ace': 51,
    }

    const bonusPayouts: Record<string,number> = {
        'royal_flush': 1001,
        'straight_flush': 201,
        'four_of_a_kind': 101,
        'full_house': 21,
        'flush': 16,
        'straight': 11,
        'three_of_a_kind': 8
    }

    if((playerWinner == 'player_A') && (chip == 1)){
        resultData.status = 'win';
        resultData.mult = playerPayouts[chip];
        resultData.winAmount = betAmount*resultData.mult;
    }else if((playerWinner == 'player_B') && (chip == 2)){
        resultData.status = 'win';
        resultData.mult = playerPayouts[chip];
        resultData.winAmount = betAmount*resultData.mult;
    }else if(bonusHand && chip == 5) {
        resultData.status = 'win';
        resultData.mult = bonusPayouts[bonusHand];
        resultData.winAmount = Math.min(betAmount*resultData.mult, appConfig.maxCashoutAmount);
    }else if((playerAHandType != 'high_card') && chip == 3 ){
        resultData.status = 'win';
        resultData.mult = pairPlusPayouts[playerAHandType];
        resultData.winAmount = Math.min(betAmount*resultData.mult, appConfig.maxCashoutAmount);
    }else if((playerBHandType != 'high_card') && chip == 4 ){
        resultData.status = 'win';
        resultData.mult = pairPlusPayouts[playerBHandType];
        resultData.winAmount = Math.min(betAmount*resultData.mult, appConfig.maxCashoutAmount);
    }
    return resultData;
   
};