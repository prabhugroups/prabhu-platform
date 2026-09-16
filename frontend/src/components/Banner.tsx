"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export interface BannerSlide {
  title: string;
  link: string | null;
  imageUrl: string;
}

/** Homepage hero carousel — ported from prabhucablecar-web's Banner.tsx.
 * Data is fetched server-side by the parent page and passed in as props
 * instead of a client Redux fetch; only the autoplay/transition needs to be
 * client-side. */
export function Banner({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = setInterval(() => {
      setPrevIndex(index);
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[index];
  const prev = slides[prevIndex];

  return (
    <>
      <div className="relative mx-auto h-[180px] w-full max-w-[96vw] overflow-hidden rounded-xl md:h-[350px] lg:h-[450px] xl:h-[550px] 2xl:h-[600px]">
        {prev && (
          <Image
            src={prev.imageUrl}
            alt={prev.title || "banner"}
            fill
            className="absolute inset-0 rounded-xl object-cover"
            priority={prevIndex === 0}
          />
        )}
        {current && (
          <motion.div
            key={index}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={current.imageUrl}
              alt={current.title || "banner"}
              fill
              className="rounded-xl object-cover"
            />
          </motion.div>
        )}
        {current && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-lg p-4 max-md:hidden md:gap-4 lg:bottom-8 lg:left-8">
            <span className="text-base font-bold text-white md:text-xl lg:text-2xl xl:text-3xl">
              {current.title || "Banner Title"}
            </span>
            {current.link && (
              <Link href={current.link}>
                <Button>Learn More</Button>
              </Link>
            )}
          </div>
        )}
      </div>
      {current && (
        <div className="z-10 flex flex-col gap-2 rounded-lg p-4 md:hidden md:gap-4">
          <span className="text-base font-bold md:text-xl lg:text-2xl xl:text-3xl">
            {current.title || "Banner Title"}
          </span>
          {current.link && (
            <Link href={current.link}>
              <Button>Learn More</Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
