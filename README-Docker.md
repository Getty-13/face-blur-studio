# Face Blur Studio - Docker Deployment

Deploy Face Blur Studio on your Unraid server or any Docker environment.

## Quick Start with Unraid

### Method 1: Using Community Applications (Recommended)
1. Install Community Applications plugin if not already installed
2. Search for "Face Blur Studio" in Community Applications
3. Click Install and configure the port (default: 8080)

### Method 2: Manual Docker Template
1. Copy the contents of `unraid-template.xml`
2. In Unraid, go to Docker → Add Container
3. Click "Template" dropdown and paste the XML
4. Configure settings and click Apply

### Method 3: Command Line
```bash
docker run -d \
  --name face-blur-studio \
  -p 8080:80 \
  --restart unless-stopped \
  face-blur-studio:latest
```

## Building from Source

1. Clone this repository
2. Build the Docker image:
```bash
docker build -t face-blur-studio .
```

3. Run the container:
```bash
docker-compose up -d
```

## Docker Compose Deployment

```bash
# Clone repository
git clone <your-repo-url>
cd face-blur-studio

# Start the service
docker-compose up -d

# Access at http://your-server-ip:8080
```

## Configuration

### Ports
- **8080**: Web interface (configurable)

### Volumes (Optional)
- `/config`: Configuration and cache storage

### Environment Variables
- `NODE_ENV`: Set to `production` (default)

## Access
Once deployed, access Face Blur Studio at:
- **Local**: http://localhost:8080
- **Network**: http://[server-ip]:8080
- **Unraid**: Available in Docker tab

## Features
- 🎯 **AI-powered face detection** - Uses Hugging Face Transformers in browser
- 🎨 **Multiple censoring options** - Black squares, bars, pixelation
- ⚡ **Real-time preview** - See changes instantly
- 📱 **Responsive design** - Works on desktop and mobile
- 🔒 **Privacy-focused** - All processing happens in browser
- 💾 **Full resolution download** - Get high-quality results

## Browser Requirements
- Modern browser with WebGL support
- Sufficient RAM for AI model loading (2GB+ recommended)
- For best performance: Chrome/Edge with WebGPU support

## Troubleshooting

### Container won't start
- Check port conflicts (8080 already in use)
- Verify sufficient disk space
- Check Docker logs: `docker logs face-blur-studio`

### Face detection not working
- Ensure modern browser with WebGL
- Clear browser cache and reload
- Check browser console for errors
- Try smaller images if memory issues

### Performance issues
- Use Chrome/Edge for WebGPU acceleration
- Ensure sufficient system RAM
- Consider resizing large images before processing

## Security Notes
- All AI processing happens client-side
- No images are uploaded to servers
- Safe for sensitive content processing
- HTTPS recommended for production use

## Updates
```bash
# Pull latest image
docker pull face-blur-studio:latest

# Restart container
docker-compose down && docker-compose up -d
```