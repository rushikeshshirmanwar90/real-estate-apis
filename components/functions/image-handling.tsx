export const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImages: React.Dispatch<React.SetStateAction<string[]>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    if (!e.target.files?.length) return;
    setIsLoading(true);

    const uploadPromises = Array.from(e.target.files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'realEstate');

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/dlcq8i2sc/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cloudinary error:', errorData);
                return null;
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Upload failed:', error);
            return null;
        }
    });

    const urls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

    setImages((prevImages) => [...prevImages, ...urls]);
    setIsLoading(false);

    return urls;
};

export const removeImage = (
    index: number,
    setImages: React.Dispatch<React.SetStateAction<string[]>>
) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
};