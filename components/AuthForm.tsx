"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

// AuthForm Schema and types 
const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  });
};

// AuthForm types 
const AuthForm = ({ type }: { type: FormType }) => {
  // Router and Firebase auth
  const router = useRouter();

  // Form Schema and form
  const formSchema = authFormSchema(type);

  // Form validation and submission
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // On submit function 
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Check if the user is signing up or signing in  
    try {
      if (type === "sign-up") {
        // Create user with email and password 
        const { name, email, password } = data;

        // User creation with Firebase auth 
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Result of the sign up action 
        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });

        // if the result is not successful, show error message
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        // toast success message and redirect to sign in page
        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else {
        // Sign in with email and password
        const { email, password } = data;

        // user credential with Firebase auth 
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // id token for the user to be used in the sign in action
        const idToken = await userCredential.user.getIdToken();

        // if the id token is not available, show error message
        if (!idToken) {
          toast.error("Sign in Failed. Please try again.");
          return;
        }

        // sign in action with the id token
        await signIn({
          email,
          idToken,
        });

        // toast success message and redirect to home page
        toast.success("Signed in successfully.");
        router.push("/");
      }
    } catch (error) {
      // if there is an error, show error message
      console.log(error);
      toast.error(`There was an error: ${error}`);
    }
  };

  // Is sign in or sign up
  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">PrepWise</h2>
        </div>

        <h3>Practice job interviews with AI</h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
                type="text"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email address"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
            />

            <Button className="btn" type="submit">
              {isSignIn ? "Sign In" : "Create an Account"}
            </Button>
          </form>
        </Form>

        <p className="text-center">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-user-primary ml-1"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
