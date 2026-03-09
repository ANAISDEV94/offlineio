

# Replace Trip Card Images with Pinterest Photos

## Changes

### 1. Copy uploaded images to `src/assets/trips/`
Replace the AI-generated images with the user's curated Pinterest photos:
- `IMG_0108.JPG` → `src/assets/trips/miami.jpg` (women in sparkly dresses walking at night)
- `IMG_0117.jpg` → `src/assets/trips/cabo.jpg` (girlfriends in white robes with drinks)
- `IMG_0119.JPG` → `src/assets/trips/tulum.jpg` (beach club girlfriends)
- `IMG_0126.JPG` → `src/assets/trips/nyc.jpg` (women crossing NYC street at night)

### 2. Update `src/components/landing/TripsBeingPlanned.tsx`
Update the `alt` text for each image to match the new photos:
- Miami: "Girlfriends walking Miami streets at night in sparkly dresses"
- Cabo: "Girlfriends in white robes drinking by the pool"
- Tulum: "Girlfriends at a beach club in Tulum"
- NYC: "Girlfriends crossing a NYC street at night"

