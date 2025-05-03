import { interviewCovers, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// function to merge class names 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// techIconBaseURL is the base URL for the tech icons
const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

// normalizeTechName is a function that takes a tech name as input
const normalizeTechName = (tech: string) => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return mappings[key as keyof typeof mappings];
};

// If the key is not found in the mappings, return the original tech name as key
const checkIconExists = async (url: string) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok; // Returns true if the icon exists
  } catch {
    return false;
  }
};

// getTechLogos is a function that takes an array of tech names as input
export const getTechLogos = async (techArray: string[]) => {
  // techArray is an array of tech names to get logos for 
  const logoURLs = techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    return {
      tech,
      url: `${techIconBaseURL}/${normalized}/${normalized}-original.svg`,
    };
  });

  const results = await Promise.all(
    logoURLs.map(async ({ tech, url }) => ({
      tech,
      url: (await checkIconExists(url)) ? url : "/tech.svg",
    }))
  );

  return results;
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};
