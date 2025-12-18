import { toast } from "react-toastify"

export const successToast = (msg: string) => {
    toast(msg, {
        position: "top-center",
        autoClose: 3000,
        draggable: true,
        pauseOnHover: false,
        progress: undefined,
        theme: "light",
        type: "success"
    });
}

export const errorToast = (msg: string) => {
    toast(msg, {
        position: "top-center",
        autoClose: 3000,
        draggable: true,
        pauseOnHover: false,
        progress: undefined,
        theme: "light",
        type: "error"
    });
}
