import * as z from "zod";

export const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  totalBuilding: z.number().min(1, "Must have at least 1 building"),
  images: z
    .array(z.string().url("Must be valid URLs"))
    .min(1, "At least one image is required"),
  state: z.string().min(2, "State must be at least 2 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  area: z.string().min(2, "Area must be at least 2 characters"),
  address: z.string().min(10, "Please enter complete address"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  projectType: z.string(),
  clientId: z.string(),
});

export type FormValues = z.infer<typeof formSchema>;

export const flatFormSchema = z
  .object({
    name: z.string().min(2, "Flat name must be at least 2 characters"),
    buildingId: z.string().optional(),
    BHK: z.number().min(1, "BHK must be at least 1"),
    area: z.number().min(1, "Area must be greater than 0"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .optional(),
    total: z.number().min(1, "Total units must be at least 1"),
    booked: z.number().min(0, "Booked units cannot be negative"),
    images: z
      .array(z.string().url("Each image must be a valid URL"))
      .min(1, "At least one image is required"),
    ytLink: z.string().url("YouTube link must be a valid URL").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.booked > data.total) {
      ctx.addIssue({
        path: ["booked"],
        message: "Booked units cannot exceed total units",
        code: "custom",
      });
    }
  });

export type FlatFormValues = z.infer<typeof flatFormSchema>;
