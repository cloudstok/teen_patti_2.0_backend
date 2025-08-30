import { LobbyData } from '../../interfaces';
import { write } from '../../utilities/db-connection';
import { createLogger } from '../../utilities/logger';

const SQL_INSERT_LOBBIES = 'INSERT INTO lobbies (lobby_id, start_delay, end_delay, result) values(?,?,?,?)';

export const insertLobbies = async (data: LobbyData): Promise<void> => {
  try {
    const { lobbyId, start_delay, end_delay, finalResult } = data;
    await write(SQL_INSERT_LOBBIES, [
      lobbyId,
      start_delay,
      end_delay,
      JSON.stringify(finalResult) 
    ]);
  } catch (err:any) {
    console.error(err);
    createLogger("lobbies","jsonl").info(err.message)
  }
};
