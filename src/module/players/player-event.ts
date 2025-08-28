import axios from 'axios';
import { FinalUserData, RawUserData } from '../../interfaces';



export const getUserDataFromSource = async (
  token: string,
  game_id: string
): Promise<FinalUserData | false | undefined> => {
  try {
    const response = await axios.get(`${process.env.BASE_URL}/service/user/detail`, {
      headers: {
        token
      }
    });

    const userData: RawUserData | undefined = response?.data?.user;

    if (userData) {
      const userId = encodeURIComponent(userData.user_id);
      const { operatorId } = userData;
      const id = `${operatorId}:${userId}`;


      const finalData: FinalUserData = {
        ...userData,
        userId,
        id,
        game_id,
        token,

      };

      return finalData;
    }

    return;
  } catch (err: any) {
    console.error(err);
    return false;
  }
};
