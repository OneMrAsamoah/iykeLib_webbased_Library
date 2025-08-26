# Image Slider Setup Guide

## Overview
The image slider has been successfully integrated into your hero section as a background carousel. It automatically rotates through images with smooth transitions and includes navigation controls.

## Features
- **Auto-rotation**: Images automatically change every 4 seconds
- **Navigation arrows**: Left/right arrow buttons for manual navigation
- **Dot indicators**: Click on dots to jump to specific images
- **Smooth transitions**: Fade effects between images
- **Responsive design**: Works on all screen sizes
- **Overlay content**: Hero text and search bar overlay the images

## Current Setup
The slider is currently using placeholder images:
- `/public/slider1.jpg`
- `/public/slider2.jpg` 
- `/public/slider3.jpg`

## How to Replace with Your Images

### Option 1: Replace Placeholder Files
1. Delete the placeholder files in the `public/` directory
2. Add your actual `slider.png` images to the `public/` directory
3. Update the `heroImages` array in `src/pages/Index.tsx`:

```typescript
const heroImages = [
  "/your-image-1.png",
  "/your-image-2.png", 
  "/your-image-3.png"
];
```

### Option 2: Use Different Image Names
1. Add your images to the `public/` directory with any names you prefer
2. Update the `heroImages` array accordingly

## Image Recommendations
- **Format**: PNG, JPG, or WebP
- **Dimensions**: 1920x1080 or higher for best quality
- **Aspect ratio**: 16:9 or similar widescreen format
- **File size**: Keep under 2MB for fast loading
- **Content**: Choose images that complement your text overlay

## Customization Options

### Change Auto-rotation Speed
In `src/pages/Index.tsx`, modify the `autoPlayInterval` prop:

```typescript
<ImageSlider 
  images={heroImages} 
  autoPlayInterval={6000} // 6 seconds instead of 4
  className="w-full h-full"
/>
```

### Add More Images
Simply add more image paths to the `heroImages` array:

```typescript
const heroImages = [
  "/slider1.jpg",
  "/slider2.jpg", 
  "/slider3.jpg",
  "/slider4.jpg", // Add more images
  "/slider5.jpg"
];
```

### Modify Transition Effects
Edit the `ImageSlider.tsx` component to change:
- Transition duration (currently 1000ms)
- Transition type (currently fade)
- Animation easing

## Troubleshooting

### Images Not Loading
- Check that image files exist in the `public/` directory
- Verify file paths in the `heroImages` array
- Ensure image file names match exactly (case-sensitive)

### Slider Not Working
- Check browser console for errors
- Verify all imports are correct
- Ensure the `ImageSlider` component is properly imported

### Performance Issues
- Optimize image file sizes
- Consider using WebP format for better compression
- Reduce the number of images if needed

## Files Modified
- `src/components/ImageSlider.tsx` - New component
- `src/pages/Index.tsx` - Updated hero section
- `public/slider1.jpg` - Placeholder image 1
- `public/slider2.jpg` - Placeholder image 2  
- `public/slider3.jpg` - Placeholder image 3

## Next Steps
1. Replace placeholder images with your actual `slider.png` images
2. Test the slider functionality
3. Adjust timing and effects as needed
4. Customize the overlay styling if desired

The image slider is now fully functional and ready to use with your custom images!

