import { Bookmark, Share2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * DummyPost Component
 * Matches the Zomato-themed job listing design for the live preview
 */
export function DummyPost() {
  return (
    <div className="bg-white">
      {/* Featured Header Image */}
      <div className="relative h-32 w-full overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop" 
          alt="Company Background"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-white">Zomato</h3>
            <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
              <Clock className="h-3 w-3" />
              <span>15 Hours ago</span>
            </div>
          </div>
          <p className="text-xs text-white/90 font-medium">Full Time | Gurgaon, India</p>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between border-b border-gray-100 p-2">
        <div className="flex gap-2">
          <Button variant="secondary" className="h-7 rounded-md bg-gray-100 px-2 text-xs font-base text-gray-900 hover:bg-gray-200">
            View Details
          </Button>
          <Button className="h-7 rounded-md bg-[#3b5998] px-2 text-xs font-base text-white hover:bg-[#3b5998]/90">
            Apply Now
          </Button>
        </div>
        <div className="flex gap-3">
          <Bookmark className="h-3 w-3 text-[#3b5998]" />
          <Share2 className="h-3 w-3 text-gray-400" />
        </div>
      </div>

      {/* Job Description Content */}
      <div className="p-2 space-y-2">
        <div>
          <h2 className="text-sm font-bold text-[#2d2e5f]">UX Designer</h2>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              Qualification: <span className="font-semibold text-gray-900">Bachelor's Degree</span>
            </p>
            <p className="text-xs text-gray-500">
              Salary: <span className="font-semibold text-gray-900">5 LPA - 10 LPA</span>
            </p>
            <p className="text-xs text-gray-500">
              Experience: <span className="font-semibold text-gray-900">2 - 5 years</span>
            </p>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-gray-600">
          We are the teams who create all of Facebook's products used by ...
        </p>
      </div>
    </div>
  );
}
