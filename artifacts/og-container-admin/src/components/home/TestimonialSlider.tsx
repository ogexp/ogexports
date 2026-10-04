import React, { useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Testimonial } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

interface TestimonialSliderProps {
  testimonials?: Testimonial[];
}

export function TestimonialSlider({ testimonials = [] }: TestimonialSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [activeRole, setActiveRole] = useState<string>("all");

  const roles = ["all", ...Array.from(new Set(testimonials.map(t => t.role)))];

  const filteredTestimonials = activeRole === "all" 
    ? testimonials 
    : testimonials.filter(t => t.role === activeRole);

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  const formatRole = (role: string) => {
    if (role === "all") return "All Partners";
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (!testimonials.length) return null;

  return (
    <div className="w-full space-y-12">
      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-2">
        {roles.map(role => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeRole === role 
                ? "bg-accent text-accent-foreground shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
            }`}
          >
            {formatRole(role)}
          </button>
        ))}
      </div>

      {/* Carousel */}
      <div className="relative max-w-5xl mx-auto px-4 md:px-12">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y py-8">
            {filteredTestimonials.map((t, idx) => (
              <div key={t.id} className="flex-[0_0_100%] md:flex-[0_0_50%] min-w-0 pl-4 md:pl-8">
                <div className="h-full glass-panel p-8 rounded-2xl flex flex-col relative group hover:border-accent/40 transition-colors">
                  <Quote className="absolute top-6 right-6 w-12 h-12 text-primary/10 group-hover:text-accent/10 transition-colors" />
                  
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < t.rating ? "text-accent fill-accent" : "text-muted"}`} />
                    ))}
                  </div>
                  
                  <p className="text-lg text-foreground leading-relaxed italic mb-8 flex-1">
                    "{t.quote}"
                  </p>
                  
                  <div className="mt-auto">
                    <div className="font-heading font-bold text-foreground text-lg">{t.authorName}</div>
                    <div className="text-sm text-muted-foreground mb-1">{t.company} • {t.country}</div>
                    <div className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded font-medium mt-2">
                      {formatRole(t.role)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full w-10 h-10 bg-background/80 backdrop-blur border-border hover:border-accent hover:text-accent z-10 hidden md:flex"
          onClick={scrollPrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full w-10 h-10 bg-background/80 backdrop-blur border-border hover:border-accent hover:text-accent z-10 hidden md:flex"
          onClick={scrollNext}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
