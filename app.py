from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import re
import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import urlparse, parse_qs

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

class YouTubeProcessor:
    def __init__(self):
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'writesubtitles': False,
            'writeautomaticsub': False,
        }
    
    def extract_video_id(self, url):
        """Extract YouTube video ID from various URL formats"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def get_video_info(self, url):
        """Extract video information using yt-dlp"""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Extract relevant information
                video_data = {
                    'title': info.get('title', 'Unknown Title'),
                    'description': info.get('description', ''),
                    'duration': info.get('duration', 0),
                    'view_count': info.get('view_count', 0),
                    'upload_date': info.get('upload_date', ''),
                    'uploader': info.get('uploader', 'Unknown'),
                    'thumbnail': info.get('thumbnail', ''),
                    'video_id': self.extract_video_id(url)
                }
                
                # Get high quality thumbnail
                if video_data['video_id']:
                    video_data['thumbnail'] = f"https://img.youtube.com/vi/{video_data['video_id']}/maxresdefault.jpg"
                
                return video_data
                
        except Exception as e:
            print(f"Error extracting video info: {str(e)}")
            return None
    
    def generate_summary(self, title, description, duration):
        """Generate a simple summary from video metadata"""
        try:
            # Clean and truncate description
            clean_desc = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', description)
            clean_desc = re.sub(r'\n+', ' ', clean_desc)
            clean_desc = clean_desc.strip()
            
            # Format duration
            duration_str = self.format_duration(duration)
            
            # Create summary
            if len(clean_desc) > 200:
                summary = clean_desc[:200] + "..."
            else:
                summary = clean_desc if clean_desc else "No description available."
            
            # Add context
            full_summary = f"📹 **{title}**\n\n"
            full_summary += f"⏱️ Duration: {duration_str}\n\n"
            full_summary += f"📝 Description: {summary}"
            
            return full_summary
            
        except Exception as e:
            return f"Unable to generate summary: {str(e)}"
    
    def format_duration(self, seconds):
        """Convert seconds to readable format"""
        if not seconds:
            return "Unknown duration"
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"

# Initialize processor
youtube_processor = YouTubeProcessor()

@app.route('/')
def home():
    return jsonify({
        "message": "YouTube Video Processor API",
        "status": "running",
        "endpoints": {
            "/process": "POST - Process YouTube URL",
            "/health": "GET - Health check"
        }
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "timestamp": time.time()})

@app.route('/process', methods=['POST'])
def process_video():
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                "error": "Missing URL in request body",
                "success": False
            }), 400
        
        url = data['url'].strip()
        
        # Validate YouTube URL
        if not re.match(r'^https?://(www\.)?(youtube\.com|youtu\.be)', url):
            return jsonify({
                "error": "Invalid YouTube URL",
                "success": False
            }), 400
        
        print(f"Processing URL: {url}")
        
        # Extract video information
        video_info = youtube_processor.get_video_info(url)
        
        if not video_info:
            return jsonify({
                "error": "Failed to extract video information",
                "success": False
            }), 500
        
        # Generate summary
        summary = youtube_processor.generate_summary(
            video_info['title'],
            video_info['description'],
            video_info['duration']
        )
        
        # Prepare response
        response_data = {
            "success": True,
            "video": {
                "title": video_info['title'],
                "thumbnail": video_info['thumbnail'],
                "summary": summary,
                "duration": youtube_processor.format_duration(video_info['duration']),
                "uploader": video_info['uploader'],
                "view_count": video_info['view_count'],
                "video_id": video_info['video_id']
            },
            "processed_at": time.time()
        }
        
        print(f"Successfully processed: {video_info['title']}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "success": False
        }), 500

@app.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint with a sample YouTube URL"""
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll for testing
    
    try:
        video_info = youtube_processor.get_video_info(test_url)
        if video_info:
            summary = youtube_processor.generate_summary(
                video_info['title'],
                video_info['description'],
                video_info['duration']
            )
            
            return jsonify({
                "test": "success",
                "sample_data": {
                    "title": video_info['title'],
                    "thumbnail": video_info['thumbnail'],
                    "summary": summary[:200] + "..." if len(summary) > 200 else summary
                }
            })
        else:
            return jsonify({"test": "failed", "error": "Could not extract video info"})
            
    except Exception as e:
        return jsonify({"test": "failed", "error": str(e)})

if __name__ == '__main__':
    print("🚀 Starting YouTube Video Processor API...")
    print("📡 API will be available at: http://localhost:5000")
    print("🔗 Endpoints:")
    print("   GET  /health - Health check")
    print("   POST /process - Process YouTube URL")
    print("   GET  /test - Test with sample video")
    print("   GET  / - API information")
    print("\n✨ Ready to process YouTube videos!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
