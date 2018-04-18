export interface Attribute {
    type: string;
    value: string;
    displayed: boolean;
}

export interface Profile {
    name: string;
    attributes: Attribute[];
    tags: string[];
}