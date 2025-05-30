"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000, // milliseconds
  });

  // Set cookie in the browser
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

// Define types for user and authentication parameters for sign up and sign in
export async function signUp(params: SignUpParams) {
  // Uid, name, email, profileURL, resumeURL
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await db.collection("users").doc(uid).get();

    // if user exists, return error
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await db.collection("users").doc(uid).set({
      name,
      email,
      // profileURL,
      // resumeURL,
    });

    // Create user in Firebase Authentication
    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: unknown) {
    // if error is an instance of Error, log the message
    if (error instanceof Error) {
      console.error("Error creating user:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    interface FirebaseError extends Error {
      code: string;
    } 

    // If error is related to email already exists 
    if (error instanceof Error && (error as FirebaseError).code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    // Handle other errors 
    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

// Define types for user and authentication parameters for sign up and sign in
export async function signIn(params: SignInParams) {
  // email, idToken for sign in
  const { email, idToken } = params;

  // Try to get user by email from Firebase Authentication
  try {
    // User record is not needed for sign in
    const userRecord = await auth.getUserByEmail(email);

    // if user does not exist, return error
    if (!userRecord)
      return {
        success: false,
        message: "User does not exist. Create an account.",
      };

    // Set session cookie for the user
    await setSessionCookie(idToken);
  } catch (error: unknown) {
    console.error("Error during sign-in:", error);

    return {
      success: false,
      message: "Failed to log into account. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  // Clear session cookie
  const cookieStore = await cookies();

  // Set cookie to expire immediately
  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  // Get cookie store from the request headers
  const cookieStore = await cookies();

  // Get session cookie from the cookie store
  const sessionCookie = cookieStore.get("session")?.value;

  // If session cookie is not present, return null
  if (!sessionCookie) return null;

  // Try to verify the session cookie
  try {
    // Verify the session cookie and decode the claims
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    if (!userRecord.exists) return null;

    // If user does not exist, return null
    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (error) {
    console.log(error);

    // Invalid or expired session
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
