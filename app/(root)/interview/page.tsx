import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  try {
    const user = await getCurrentUser();
    console.log("Fetched user:", user);

    if (!user) {
      console.error("User is undefined. Redirecting or showing an error message.");
      return <p>Error: Unable to fetch user information.</p>;
    }

    return (
      <>
        <h3>Interview generation</h3>

        <Agent
          userName={user.name}
          userId={user.id}
          profileImage={user.profileURL}
          type="generate"
        />
      </>
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return <p>Error: Something went wrong while fetching user data.</p>;
  }
};

export default Page;
