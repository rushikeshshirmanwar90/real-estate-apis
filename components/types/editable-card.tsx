interface FieldOption {
    label: string
    value: string
}

export interface Field {
    key: string
    label: string
    value: string | number | undefined
    type: 'text' | 'textarea' | 'number' | 'select'
    options?: FieldOption[]
}

export interface EditableSectionCardProps {
    title: string
    fields?: Field[]
    images?: string[]
    icon?: React.ReactNode
    onFieldChange?: (key: string, value: string | number) => void
    onImagesChange?: (images: string[]) => void
}

export interface AmenitiesProps {
    name: string,
    icon: string
}