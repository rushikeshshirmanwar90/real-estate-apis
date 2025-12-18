import jwt from "jsonwebtoken"
import Cookies from 'js-cookie';


interface cookieDataProps {
    email: string;
    userId: string;
}

export const getClientId = async () => {

    const getCookie = Cookies.get('client_auth_token');

    if (!getCookie) {
        return null;
    }

    const decodedToken = jwt.decode(String(getCookie)) as cookieDataProps;

    const userId = decodedToken.userId;

    console.log(userId)
    return userId;
}

