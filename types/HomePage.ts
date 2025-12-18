export interface HeroSectionDetails {
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
}

export interface HeroSectionProps {
  clientId?: string | undefined | null;
  heroSectionDetails: HeroSectionDetails[];
}
