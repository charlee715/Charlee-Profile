import { Awards } from "@/components/Awards/Awards";
import { Footer } from "@/components/Footer/Footer";
import { Hero } from "@/components/Hero/Hero";
import { MotionLayout } from "@/components/MotionLayout/MotionLayout";
import { Publications } from "@/components/Publications/Publications";

export default function Home() {
  return (
    <MotionLayout>
      <main>
        <Hero />
        <Publications />
        <Awards />
      </main>
      <Footer />
    </MotionLayout>
  );
}
