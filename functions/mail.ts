import { Details } from "@/components/types/customer";
import domain from "@/components/utils/domain";
import axios from "axios";

export const findUser = async (email: string) => {
  const res = await axios.post(`${domain}/api/user/find`, {
    email: email,
  });

  if (res.status == 200 || res.status == 201) {
    return true;
  } else {
    return false;
  }
};

export const sendOtp = async (email: string) => {
  const res = await axios.post(`${domain}/api/send-otp`, {
    email: email,
  });

  if (res.status == 200) {
    const data = res.data;

    return data.otp;
  } else {
    return false;
  }
};

export const verifyOtp = async (email: string, otp: string | number) => {
  const res = await axios.post(`${domain}/api/user/otp/valid`, {
    email: email,
    otp: otp,
  });

  if (res.status == 200) {
    return true;
  } else {
    return false;
  }
};

export const thankYouMail = async (email: string, details: Details) => {
  const res = await axios.post(`${domain}/api/send-mail`, {
    email: email,
    details: details,
  });

  if (res.status == 200) {
    return true;
  } else {
    return false;
  }
};
