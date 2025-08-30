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

  const { finalResult } = evaluateHands()
  const playerAHand = finalResult.playerAHand
  const playerBHand = finalResult.playerBHand
  const playerAHandType = finalResult.playerAHandType
  const playerBHandType = finalResult.playerBHandType
  const bonusHandType = finalResult.bonusHand
  const winner = finalResult.winner

  recurLobbyData.status = 2;
  setCurrentLobby(recurLobbyData);
  let pA = [];
  let pB = [];
  for (let i = 0; i < playerAHand.length; i++) {
    pA.push(Object.values(playerAHand[i]).join(""))
    io.emit('cards', `${lobbyId}:${JSON.stringify({ pA })}:RESULT`);
    await sleep(1000);
    pB.push(Object.values(playerBHand[i]).join(""))
    io.emit('cards', `${lobbyId}:${JSON.stringify({ pB })}:RESULT`);
    await sleep(1000);
  };

  // result emit
  io.emit('result', { playerAHandType, playerBHandType, bonusHandType, winner })
  await sleep(1000);
  io.emit('cards', `${lobbyId}:${1}:ENDED`);
  await settleBet(io, finalResult, lobbyId);

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
    finalResult,
  }
  
  await insertLobbies(history);

  return initLobby(io);
};
