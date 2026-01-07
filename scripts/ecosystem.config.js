module.exports = {
    apps: [
      {
        name: "playlist-pusher",
        script: "playlist-pusher.js",
        watch: false,
        restart_delay: 5000
      },
      {
        name: "multi-audio-stream",
        script: "multi-audio-stream.js",
        watch: false,
        restart_delay: 5000
      }
    ]
  };