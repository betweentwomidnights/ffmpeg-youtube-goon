const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const AUDIO_DIR = path.join(process.env.HOME, 'radio-stream', 'audio');
const LINKS_FILE = path.join(__dirname, 'yt_links.txt');

// Track metadata with titles and series information
const trackMetadata = {
  'CC_3_Files/cc3_1.mp3': { 
    title: 'cc3_1', 
    series: 'cc', 
    season: 3, 
    episode: 1, 
    youtubeLink: 'https://youtu.be/C8MACRGd66Q',
    description: 'from captains chair season 3' 
  },
  'CC_3_Files/cc3_3.mp3': { 
    title: 'cc3_3', 
    series: 'cc',
    season: 3, 
    episode: 3, 
    youtubeLink: 'https://youtu.be/X3vqwes1gf4',
    description: 'from captains chair season 3' 
  },
  'CC_3_Files/cc3_4.mp3': { 
    title: 'cc3_4', 
    series: 'cc', 
    season: 3, 
    episode: 4, 
    youtubeLink: 'https://youtu.be/vmnqMRcvlCc',
    description: 'from captains chair season 3' 
  },
  'CC_3_Files/cc3_5.mp3': { 
    title: 'cc3_5', 
    series: 'cc', 
    season: 3, 
    episode: 5, 
    youtubeLink: 'https://youtu.be/PZWAJYmURbQ',
    description: 'from captains chair season 3' 
  },
  'CC_3_Files/cc3_6.mp3': { 
    title: 'cc3_8', 
    series: 'cc', 
    season: 3, 
    episode: 6, 
    youtubeLink: 'https://youtu.be/5VPjC7Lx0gA',
    description: 'from captains chair season 3' 
  },
  'CC_3_Files/cc3_7.mp3': { 
    title: 'cc3_7', 
    series: 'cc', 
    season: 3, 
    episode: 7, 
    youtubeLink: 'https://youtu.be/5VPjC7Lx0gA',
    description: 'from captains chair season 3' 
  },
  'CC_3_Files/cc3_8.mp3': { 
    title: 'cc3_8', 
    series: 'cc', 
    season: 3, 
    episode: 8, 
    youtubeLink: 'https://youtu.be/7oeLNDRUkvs',
    description: 'from captains chair season 3' 
  },
  
  'CC_2_Files/captains_chair_s2_ep1.mp3': { 
    title: 'cc2_1', 
    series: 'cc', 
    season: 2, 
    episode: 1, 
    youtubeLink: 'https://youtu.be/D4E9zAmrCQ8',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep2.mp3': { 
    title: 'cc2_2', 
    series: 'cc', 
    season: 2, 
    episode: 2, 
    youtubeLink: 'https://youtu.be/JJZ4H4QuESM',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep3.mp3': { 
    title: 'cc2_3', 
    series: 'cc', 
    season: 2, 
    episode: 3, 
    youtubeLink: 'https://youtu.be/CPDdRkoycDs',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep4.mp3': { 
    title: 'cc2_4', 
    series: 'cc', 
    season: 2, 
    episode: 4, 
    youtubeLink: 'https://youtu.be/bPb0OWL3_UM',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep5.mp3': { 
    title: 'cc2_5', 
    series: 'cc', 
    season: 2, 
    episode: 5, 
    youtubeLink: 'https://youtu.be/eQgUbpZo3ak',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep6.mp3': { 
    title: 'cc2_6', 
    series: 'cc', 
    season: 2, 
    episode: 6, 
    youtubeLink: 'https://youtu.be/PHZ-DoqTC3M',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep7.mp3': { 
    title: 'cc2_7', 
    series: 'cc', 
    season: 2, 
    episode: 7, 
    youtubeLink: 'https://youtu.be/kghYoeG6SmU',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep8.mp3': { 
    title: 'cc2_8', 
    series: 'cc', 
    season: 2, 
    episode: 8, 
    youtubeLink: 'https://youtu.be/3gKj5n3AXJs',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep9.mp3': { 
    title: 'cc2_9', 
    series: 'cc', 
    season: 2, 
    episode: 9, 
    youtubeLink: 'https://youtu.be/4wgtG166_M8',
    description: 'from captain\'s chair season 2'
  },
  'CC_2_Files/captains_chair_s2_ep10.mp3': { 
    title: 'cc2_10', 
    series: 'cc', 
    season: 2, 
    episode: 10, 
    youtubeLink: 'https://youtu.be/wjqkNGvkC1E',
    description: 'from captain\'s chair season 2'
  },
  
  // Generic entries for other music collections
  'POLO_Files': { 
    title: 'POLO Remix', 
    series: 'POLO', 
    youtubeLink: 'https://www.youtube.com/watch?v=3qsUf3tBb5E',
    description: 'an infinite remix of the lofi remix of that POLO track'
  },
  'CC_1_Files': { 
    title: 'Captain\'s Chair S1', 
    series: 'Captain\'s Chair', 
    season: 1,
    description: 'season 1 of the captain\'s chair'
  },
  'LDT_Files': { 
    title: 'Let\'s Destroy That', 
    series: 'LDT', 
    youtubeLink: 'https://www.youtube.com/watch?v=zYS9VMFDdpg&list=PLTgvaF3a9YMhbL5epLPMLdlXvw198BvUD',
    description: 'from Let\'s Destroy That w/kev and friends'
  },
  'NETRUNNER_Files': { 
    title: 'NETRUNNER Soundtrack', 
    series: 'NETRUNNER',
    description: 'soundtrack to a game that doesn\'t exist yet'
  },
  'LOFI_Files': { 
    title: 'LOFI Destruction', 
    series: 'LOFI',
    description: 'just some lofi music destroyed'
  }
};

// Try to load additional descriptions from yt_links.txt
function loadAdditionalMetadata() {
  try {
    if (fs.existsSync(LINKS_FILE)) {
      const content = fs.readFileSync(LINKS_FILE, 'utf8');
      
      const folderMatches = content.match(/([A-Z_]+)_Files:[\s\S]*?(?=\n\n|\n[A-Z_]+_Files:|$)/g) || [];
      
      folderMatches.forEach(match => {
        const folderMatch = match.match(/([A-Z_]+)_Files:/);
        if (folderMatch && folderMatch[1]) {
          const folder = `${folderMatch[1]}_Files`;
          let description = match.replace(`${folder}:`, '').trim();
          
          if (trackMetadata[folder]) {
            trackMetadata[folder].description = description;
            console.log(`Updated description for ${folder}`);
          }
        }
      });
      
      console.log('Loaded additional metadata from yt_links.txt');
    }
  } catch (error) {
    console.error('Error loading additional metadata:', error);
  }
}

// Load additional metadata when the module is loaded
loadAdditionalMetadata();

// Find all audio files recursively
function findAudioFiles(dir) {
  let audioFiles = [];
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      audioFiles = audioFiles.concat(findAudioFiles(filePath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.mp3') {
        audioFiles.push(filePath);
      }
    }
  }
  
  return audioFiles;
}

// Get audio file duration using ffprobe
function getAudioDuration(filePath) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    );
    return parseFloat(output.trim());
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error);
    return 180; // Default to 3 minutes if unable to determine
  }
}

// Get metadata for a track
function getTrackMetadata(filePath) {
  const relativePath = path.relative(AUDIO_DIR, filePath);
  
  // Try to find an exact match first
  if (trackMetadata[relativePath]) {
    return {
      ...trackMetadata[relativePath],
      path: filePath,
      duration: getAudioDuration(filePath)
    };
  }
  
  // If no exact match, try to find a category match
  for (const key in trackMetadata) {
    if (relativePath.startsWith(key)) {
      const baseMetadata = trackMetadata[key];
      const fileName = path.basename(filePath, path.extname(filePath));
      
      return {
        ...baseMetadata,
        title: `${baseMetadata.series}: ${fileName}`,
        path: filePath,
        duration: getAudioDuration(filePath),
        displayName: `${baseMetadata.series}: ${fileName}`
      };
    }
  }
  
  // If no metadata found, create basic metadata
  const fileName = path.basename(filePath, path.extname(filePath));
  const dirName = path.basename(path.dirname(filePath));
  
  return {
    title: fileName,
    series: dirName,
    path: filePath,
    duration: getAudioDuration(filePath),
    displayName: `${dirName}: ${fileName}`
  };
}

// Update now playing information (console log only, no file write)
function updateNowPlaying(trackInfo) {
  const nowPlaying = {
    title: trackInfo.title,
    series: trackInfo.series,
    season: trackInfo.season || null,
    episode: trackInfo.episode || null,
    youtubeLink: trackInfo.youtubeLink || null,
    description: trackInfo.description || null,
    displayName: trackInfo.displayName || trackInfo.title,
    startTime: new Date().toISOString(),
    duration: trackInfo.duration,
    endTime: new Date(Date.now() + trackInfo.duration * 1000).toISOString()
  };
  
  console.log(`Now playing: ${trackInfo.title}`);
  return nowPlaying;
}

// Get a random track from the collection
function getRandomTrack() {
  const audioFiles = findAudioFiles(AUDIO_DIR);
  if (audioFiles.length === 0) {
    throw new Error('No audio files found!');
  }
  
  const randomIndex = Math.floor(Math.random() * audioFiles.length);
  const randomFile = audioFiles[randomIndex];
  
  return getTrackMetadata(randomFile);
}

module.exports = {
  getRandomTrack,
  updateNowPlaying,
  findAudioFiles,
  getAudioDuration,
  getTrackMetadata
};

// If run directly, print a random track
if (require.main === module) {
  const track = getRandomTrack();
  const nowPlaying = updateNowPlaying(track);
  console.log(JSON.stringify(nowPlaying, null, 2));
}