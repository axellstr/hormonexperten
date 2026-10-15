// Sharp's own AVIF default is 50, which smooths skin and hair. 90 is visually lossless at the
// sizes these photos are shown; past that, files grow sharply (about 60% from 90 to 95 on a
// 384px crop of wilden-laptop.jpg) for no visible gain. One value for every photo, so service
// cards are held to the same standard as portraits. AVIF stays the format browsers download.
export const IMAGE_QUALITY = 90;
