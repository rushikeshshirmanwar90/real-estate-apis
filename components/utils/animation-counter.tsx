import { useEffect, useState } from "react";

export const AnimatedCounter = ({ value = 0, duration = 1000 }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const step = (value - current) / (duration / 16);
        const timer = setInterval(() => {
            setCurrent((prev) => {
                const next = prev + step;
                if (Math.abs(next - value) < Math.abs(step)) {
                    clearInterval(timer);
                    return value;
                }
                return next;
            });
        }, 16);
        return () => clearInterval(timer);
    }, [value, duration]);

    return (
        <span className="tabular-nums">
            {current.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}
        </span>
    );
}