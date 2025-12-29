#!/bin/bash

# Enhanced ambient sound library for FugueState.ai
# Free sounds from Mixkit.co and compatible sources

cd "$(dirname "$0")/public/audio"

echo "🎵 Downloading enhanced ambient sound library..."

# Create directories
mkdir -p ambient sfx ui

echo ""
echo "⬇️  Downloading ambient atmospheres..."

# Different moods for different pages
curl -L "https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3" -o "ambient/space-ambient.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2487/2487-preview.mp3" -o "ambient/synth-pad.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/1471/1471-preview.mp3" -o "ambient/deep-drone.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3" -o "ambient/rain-gentle.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2485/2485-preview.mp3" -o "ambient/ethereal-pad.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2008/2008-preview.mp3" -o "ambient/dark-ambient.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2484/2484-preview.mp3" -o "ambient/meditation.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2486/2486-preview.mp3" -o "ambient/dreamy.mp3" &

wait

echo ""
echo "⬇️  Downloading UI sound effects..."

# UI Interactions
curl -L "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" -o "ui/click-soft.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" -o "ui/chime.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" -o "ui/whoosh.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3" -o "ui/swoosh.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3" -o "ui/transition.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3" -o "ui/hover.mp3" &

wait

echo ""
echo "⬇️  Downloading cinematic sound effects..."

# Special moments
curl -L "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" -o "sfx/success.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" -o "sfx/pulse.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2858/2858-preview.mp3" -o "sfx/notification.mp3" &
curl -L "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" -o "sfx/page-turn.mp3" &

wait

echo ""
echo "✅ Enhanced sound library downloaded!"
echo ""
echo "📊 Summary:"
echo "   - 8 ambient atmospheres"
echo "   - 6 UI interaction sounds"
echo "   - 4 special effect sounds"
echo ""
echo "🎧 Total: 18 audio files ready!"
