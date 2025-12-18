import domain from "@/components/utils/domain";

export const handleLogin = async (email: string, password: string) => {
    try {
        const res = await fetch(`${domain}/api/clients/login`, {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        })
        if (res.ok) {
            const data = await res.json();
            console.log(data.message);
        } else {
            console.error("Something went wrong")
        }
    } catch (error: any) {
        console.error(`Error : ${error.message}`)
    }
}