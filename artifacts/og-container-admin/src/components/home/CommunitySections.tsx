import React from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Testimonial, Faq, NewsArticle, Certification } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestimonialSlider } from "./TestimonialSlider";

export function CommunitySections({ 
  testimonials = [], 
  faqs = [], 
  news = [], 
  certifications = [] 
}: { 
  testimonials?: Testimonial[]; 
  faqs?: Faq[]; 
  news?: NewsArticle[]; 
  certifications?: Certification[] 
}) {
  
  // Group FAQs by Category
  const faqCategories = Array.from(new Set(faqs.map(f => f.category)));

  return (
    <div className="flex flex-col">
      
      {/* Testimonials */}
      <section className="py-24 bg-background border-b border-border overflow-hidden">
        <div className="container px-4 md:px-6 mb-16 text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">Trusted Worldwide.</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Hear from the partners who rely on OG Exports for their supply chain and capital deployment.
          </p>
        </div>
        <TestimonialSlider testimonials={testimonials} />
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-24 bg-card border-b border-border">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Frequently Asked Questions</h2>
            </div>

            <Tabs defaultValue={faqCategories[0]} className="w-full">
              <TabsList className="w-full justify-start md:justify-center overflow-x-auto flex-nowrap mb-8 bg-transparent p-0">
                {faqCategories.map(cat => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="rounded-full px-6 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground border border-border mx-1"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              {faqCategories.map(cat => (
                <TabsContent key={cat} value={cat} className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.filter(f => f.category === cat).map((faq) => (
                      <AccordionItem key={faq.id} value={`faq-${faq.id}`} className="glass-panel mb-4 rounded-lg border px-6">
                        <AccordionTrigger className="hover:no-underline font-heading font-semibold text-left text-lg py-6">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed text-base pb-6">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>
      )}

      {/* Latest News */}
      {news.length > 0 && (
        <section className="py-24 bg-background border-b border-border">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl md:text-4xl font-heading font-bold">Latest Insights.</h2>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {news.slice(0, 3).map((article) => (
                <div key={article.id} className="group cursor-pointer">
                  {article.imageUrl ? (
                    <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-6 bg-muted">
                      <img 
                        src={article.imageUrl} 
                        alt={article.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] rounded-2xl mb-6 bg-card border border-border flex items-center justify-center">
                      <span className="text-muted-foreground font-heading">{article.category}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground mb-3">
                    <span className="text-accent uppercase tracking-wider">{article.category}</span>
                    <span>•</span>
                    <span>{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
                  </div>
                  
                  <h3 className="text-xl font-heading font-semibold mb-3 group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Certifications Strip */}
      {certifications.length > 0 && (
        <section className="py-16 bg-card">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h3 className="text-xl font-heading font-bold text-muted-foreground">Internationally Certified Quality</h3>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex flex-col items-center gap-2 max-w-[120px]" title={cert.name}>
                  {cert.imageUrl ? (
                    <img src={cert.imageUrl} alt={cert.name} loading="lazy" decoding="async" className="h-16 object-contain" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground font-heading font-bold">
                      {cert.name.substring(0, 3)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
