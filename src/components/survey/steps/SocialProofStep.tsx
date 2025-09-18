import React from 'react';
import { Star } from 'lucide-react';
import { SurveyStepProps, Review } from '@/types/survey';

export const SocialProofStep: React.FC<SurveyStepProps> = (props) => {
  const { onAnswer } = props;

  const reviews: Review[] = [
    {
      photo: "/src/assets/survey/user_reviews/jake.png",
      name: "Jake Sullivan",
      stars: 5,
      text: "I landed a job at Datadog within a month. The approach I learned here, which is breaking problems into smaller parts and tackling one at a time, made a night-and-day difference for me."
    },
    {
      photo: "/src/assets/survey/user_reviews/priya.png",
      name: "Priya Reddy",
      stars: 5,
      text: "I hated grinding leetcode - feeling like I have to solve challenges everyday to build muscle memory and memorize solutions/templates so I don't forget anything. First principles applied towards interview problems is so much better, I'm confident now that I can solve pretty much any unfamiliar problem."
    },
    {
      photo: "/src/assets/survey/user_reviews/ashwin.png",
      name: "Ashwin K.",
      stars: 5,
      text: "Got an offer from FAANG company. Getting interviewer-style feedback was tremendous - just knowing how much I'm ready for interview helped build my confidence tremendously going into the actual interviews."
    }
  ];


  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Simplyalgo was made for people like you
        </h1>
      </div>
      
      <div className="space-y-6 mb-8">
        {reviews.map((review, index) => (
          <div key={index} className="bg-muted/50 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={review.photo}
                alt={review.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <div className="font-medium">{review.name}</div>
                <div className="flex items-center gap-1">
                  {renderStars(review.stars)}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {review.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
