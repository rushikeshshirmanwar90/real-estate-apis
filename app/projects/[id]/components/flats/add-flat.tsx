'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { Home, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { formSchema, type FlatFormValues } from '@/app/(forms)/project-form/schema';
import ImageHandler from '@/components/image-handler';

const AddFlatForm = () => {
    const searchParams = useSearchParams();
    const flatId = searchParams.get('id');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);

    const form = useForm<FlatFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            BHK: 1,
            area: 0,
            total: 1,
            booked: 0,
            description: '',
            images: [],
            ytLink: '',
            buildingId: 'f',
        },
    });

    const onSubmit = (formData: FlatFormValues) => {
        setIsLoading(true);
        console.log(formData)
    }


    return (
        <div className="p-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <Home className="w-4 h-4 mr-2" />
                        Add Flat Details
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-screen-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Flat Details</DialogTitle>
                    </DialogHeader>
                    <Card>
                        <CardHeader>
                            <CardTitle>{flatId ? 'Edit Flat' : 'Add New Flat'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-3"> {/* Better grid */}
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Flat Name/Number</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="BHK"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>BHK</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="area"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Area (sq ft)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid gap-6 md:grid-cols-3">
                                        <FormField
                                            control={form.control}
                                            name="total"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Total Units</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="booked"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Booked Units</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} className="h-32" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <ImageHandler
                                        form={form}
                                        isLoading={isLoading}
                                        setIsLoading={setIsLoading}
                                        setUploadedImages={setUploadedImages}
                                        uploadedImages={uploadedImages}
                                        title="Flat Images"
                                    />

                                    <FormField
                                        control={form.control}
                                        name="ytLink"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>YouTube Video Link (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="url" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {flatId ? 'Updating...' : 'Submitting...'}
                                            </>
                                        ) : flatId ? 'Update Flat' : 'Add Flat'}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddFlatForm;