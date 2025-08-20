import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";

export function Hero() {
  return (
    <div className="flex flex-col gap-12 items-center">
        <div className="relative h-20 w-20">
          <Image src="/claude-color.png" alt="Claude" fill />
        </div>
      <div className=" flex items-center gap-2">
        <h3 className="text-3xl lg:text-4xl !leading-tight mx-auto max-w-xl text-center">
          Claude AI: Your Personal AI Assistant
        </h3>
      </div>
      <p className="text-muted-foreground text-center">
        Claude is a chatbot that can understand, learn, and deliver.
      </p>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />

      <Link
        href="/auth/sign-up"
        className="w-full flex justify-center"
        passHref
      >
        <Button size="lg">Get Started</Button>
      </Link>
    </div>
  );
}
