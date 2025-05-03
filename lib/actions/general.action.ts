"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

// Create types for feedback and interview id
export async function createFeedback(params: CreateFeedbackParams) {

  // InterviewId, userId, transcript, feedbackId are required parameters
  const { interviewId, userId, transcript, feedbackId } = params;

  // Try to generate feedback using Google Gemini model and save it to the database
  try {
    // Check if transcript is empty or not and format it
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // Generate feedback using Google Gemini model and save it to the database
    // The model is set to "gemini-2.0-flash-001" and structuredOutputs is set to false
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    // Feedback object is created with the following properties:
    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    // Validate feedback object using feedbackSchema
    let feedbackRef;

    // If feedbackId is provided, update the existing feedback document
    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    // Set the feedback document in the database
    await feedbackRef.set(feedback);

    // If feedbackId is provided, update the existing feedback document
    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

// get interview by id and check if it exists
export async function getInterviewById(id: string): Promise<Interview | null> {
  // interview stored in the database of Firebase by id
  const interview = await db.collection("interviews").doc(id).get();

  // if interview does not exist, return null
  return interview.data() as Interview | null;
}

// get feedback by interview id and user id
export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  // interviewId and userId are required parameters
  const { interviewId, userId } = params;

  // query the database for feedback by interviewId and userId
  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  // if querySnapshot is empty, return null
  // querySnapshot is a snapshot of the database
  if (querySnapshot.empty) return null;

  // if querySnapshot is not empty, get the first document
  // querySnapshot.docs is an array of documents
  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

// get latest interviews by userId and limit
export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  // userId and limit are required parameters
  const { userId, limit = 20 } = params;

  // query the database for interviews by userId and limit
  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  // return the interviews as an array of Interview objects or null
  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

// get interviews by userId and limit by userId
export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  // userId is a required parameter for this function to work
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  // if interviews is empty, return null and exit the function
  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
