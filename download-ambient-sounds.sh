#!/bin/bash

# Script to download free ambient sounds for FugueState.ai
# These are from Mixkit.co (free, no attribution required)

cd "$(dirname "$0")/public/audio"

echo "📥 Downloading free ambient sounds from Mixkit.co..."

# Create directories if they don't exist
mkdir -p ambient sfx

# Download ambient tracks (free from Mixkit)
echo "⬇️  Downloading ambient tracks..."

# Space/Sci-Fi Ambient
curl -L "https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3" -o "ambient/space-ambient.mp3"

# Synth Pad
curl -L "https://assets.mixkit.co/active_storage/sfx/2487/2487-preview.mp3" -o "ambient/synth-pad.mp3"

# Deep Drone
curl -L "https://assets.mixkit.co/active_storage/sfx/1471/1471-preview.mp3" -o "ambient/deep-drone.mp3"

# Rain (gentle)
curl -L "https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3" -o "ambient/rain-gentle.mp3"

# Download sound effects
echo "⬇️  Downloading sound effects..."

# Whoosh
curl -L "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" -o "sfx/whoosh.mp3"

# Pulse/Click
curl -L "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" -o "sfx/pulse.mp3"

# Chime
curl -L "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" -o "sfx/chime.mp3"

echo "✅ Download complete!"
echo ""
echo "📁 Audio files saved to:"
echo "   - public/audio/ambient/"
echo "   - public/audio/sfx/"
echo ""
echo "🎵 Refresh your browser to hear the sounds!"
