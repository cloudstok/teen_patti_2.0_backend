import { LobbyData } from '../../interfaces';
import { write } from '../../utilities/db-connection';

const SQL_INSERT_LOBBIES = 'INSERT INTO lobbies (lobby_id, start_delay, end_delay, result) values(?,?,?,?)';

export const insertLobbies = async (data: LobbyData): Promise<void> => {
  try {
    const { time, ...lobbyInfo } = data;
    await write(SQL_INSERT_LOBBIES, Object.values(lobbyInfo));
  } catch (err) {
    console.error(err);
  }
};
