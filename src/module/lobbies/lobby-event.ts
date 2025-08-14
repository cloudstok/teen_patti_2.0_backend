import { Server } from 'socket.io';
import { insertLobbies } from './lobbies-db';
import { createLogger } from '../../utilities/logger';
import { setCurrentLobby } from '../bets/bets-session';
import { evaluateHands } from '../game/game';
import { settleBet } from '../bets/bets-session';

const logger = createLogger('lobbies', 'jsonl');

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const initRounds = async (io: Server): Promise<void> => {
  logger.info('lobby started');
  await initLobby(io);
};

const initLobby = async (io: Server): Promise<void> => {

  const lobbyId = Date.now();
  const recurLobbyData: { lobbyId: number; status: number } = {
    lobbyId,
    status: 0,
  };

  setCurrentLobby(recurLobbyData);

  const start_delay = 15;
  const end_delay = 4;

  for (let x = start_delay; x >= 0; x--) {
    io.emit('cards', `${lobbyId}:${x}:STARTING`);
    await sleep(1000);
  }

  recurLobbyData.status = 1;
  setCurrentLobby(recurLobbyData);

  io.emit('cards', `${lobbyId}:0:CALCULATING`);
  await sleep(3000);

  const { result } = evaluateHands()
  const playerAHand = result.playerAHand
  const playerBHand = result.playerBHand
  const playerAHandType = result.playerAHandType
  const playerBHandType = result.playerBHandType
  const bonusHandType = result.bonusHand
  const winner = result.winner


  recurLobbyData.status = 2;
  setCurrentLobby(recurLobbyData);
  let pA = [];
  let pB = [];
  for (let i = 0; i < 3; i++) {
    pA.push(Object.values(playerAHand[i]).join(""))
    io.emit('cards', `${lobbyId}:${JSON.stringify({ pA, pB })}:Player Cards:RESULT`);
    await sleep(1000);
    pB.push(Object.values(playerBHand[i]).join(""))
    io.emit('cards', `${lobbyId}:${JSON.stringify({ pA, pB })}:Player Cards:RESULT`);
    await sleep(1000);
  };
  // result emit
  io.emit('result', `${lobbyId}:${JSON.stringify({ playerAHandType, playerBHandType, bonusHandType, winner })}:Card Result: RESULT`)
  await sleep(1000);
  io.emit('cards', `${lobbyId}:${1}:ENDED`);
  await settleBet(io, result, lobbyId);

  recurLobbyData.status = 3;
  setCurrentLobby(recurLobbyData);
  for (let z = 2; z <= end_delay; z++) {
    io.emit('cards', `${lobbyId}:${z}:ENDED`);
    await sleep(1000);
  }

  const history = {
    time: new Date(),
    lobbyId,
    start_delay,
    end_delay,
    result,
  };

  io.emit('history', {
    time: history.time,
    lobbyId: history.lobbyId,
    result: history.result
  });

  logger.info(JSON.stringify(history));
  await insertLobbies(history);

  return initLobby(io);
};
