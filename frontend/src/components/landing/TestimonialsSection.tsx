"use client";
import { testimonials } from "@/lib/constant";
import React from "react";
import { Card, CardContent } from "../ui/card";

const TestimonialsSection = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Our patient love us
          </h2>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-bold text-foreground">4.8</span>
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-6 h-6 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-muted-foreground">72K+ reviews</span>
          </div>
        </div>

        {/* Testimonila grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className={`${testimonial.bgColor} border border-border hover:shadow-lg transition-shadow duration-200`}
            >
              <CardContent className="p-6">
                <div className="flex text-yellow-400">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-6 h-6 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-foreground mb-6 leading-relaxed">
                  {testimonial.text}
                </p>
                <div className="text-sm">
                  <p className="font-semibold text-primary">
                    {testimonial.author}
                  </p>
                  <p className="text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
       <button className="text-chart-2 hover:text-chart-2/80 font-medium transition-colors duration-200">
        Read more
       </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
