import domain from "@/components/utils/domain";
import axios from "axios";

export const findRoomInfo = async (id: string) => {
  try {
    const res = await axios.get(`${domain}/api/room-info?flatId=${id}`);
    const data = res.data;
    return data;
  } catch (error: any) {
    console.error(error.message);
    return null;
  }
};

export const UpdateRooms = async (id: string, data: any) => {
  try {
    const res = await axios.put(`${domain}/api/room-info?flatId=${id}`, data);
    return res.data;
  } catch (error: any) {
    console.error(error.message);
    return null;
  }
};
