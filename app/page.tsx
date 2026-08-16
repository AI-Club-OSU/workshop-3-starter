import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "./chatgpt-auth";
import { Showcase } from "./showcase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <Showcase
      user={
        user
          ? {
              displayName: user.displayName,
            }
          : null
      }
      signInPath={chatGPTSignInPath("/")}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}
