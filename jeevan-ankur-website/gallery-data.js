/* ==========================================================
   GALLERY DATA  -  the ONLY file you edit to change the gallery
   ----------------------------------------------------------
   Each line below is one photo or video. The gallery page and the
   home page preview are built from this list automatically.

   PHOTO:  { type:"photo", src:"images/file.jpg", title:"Caption", category:"Together" },
   VIDEO:  { type:"video", src:"videos/file.mp4", poster:"images/file-poster.jpg", title:"Caption" },

   - category is optional. Each new category becomes a filter button.
   - poster is the thumbnail picture for a video (optional but recommended).
   - To add something: copy a line, change the file name and caption.
   - To remove something: delete its line.
   - The order here is the order on the website.
   ========================================================== */
const GALLERY = [
  { type:"photo", src:"images/home-entrance.jpg",      title:"Jeevan Ankur Old Age Home",                    category:"Our Home" },
  { type:"photo", src:"images/volunteers-visit.jpg",   title:"Celebrating smiles and togetherness",          category:"Volunteers" },
  { type:"photo", src:"images/together-evening.jpg",   title:"An evening together with our residents",       category:"Together" },
  { type:"photo", src:"images/time-together.jpg",      title:"Little moments, big memories",                 category:"Together" },
  { type:"photo", src:"images/appeal-poster.jpg",      title:"April contribution appeal",                    category:"Appeals" },

  { type:"video", src:"videos/video1.mp4", poster:"images/video1-poster.jpg", title:"True wealth is giving" },
  { type:"video", src:"videos/video2.mp4", poster:"images/video2-poster.jpg", title:"A birthday celebration with our elders" },
  { type:"video", src:"videos/video3.mp4", poster:"images/video3-poster.jpg", title:"Blessings over parties" }
];
