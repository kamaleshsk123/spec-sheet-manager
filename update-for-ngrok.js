const fs = require('fs');
const axios = require('axios');

async function updateForNgrok() {
  try {
    console.log('🔄 Getting ngrok tunnel info...');
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    const frontendTunnel = tunnels.find(t => t.config.addr === 'localhost:4200');
    const backendTunnel = tunnels.find(t => t.config.addr === 'localhost:3000');
    
    if (backendTunnel && frontendTunnel) {
      const backendUrl = backendTunnel.public_url;
      const frontendUrl = frontendTunnel.public_url;
      
      console.log(`🔧 Backend URL: ${backendUrl}`);
      console.log(`🎨 Frontend URL: ${frontendUrl}`);
      
      // Update Angular environment
      const envContent = `export const environment = {
  production: false,
  apiUrl: '${backendUrl}/api'
};`;
      
      fs.writeFileSync('src/environments/environment.ts', envContent);
      console.log('✅ Updated Angular environment');
      
      // Update backend CORS
      const backendEnv = fs.readFileSync('backend/.env', 'utf8');
      const updatedBackendEnv = backendEnv.replace(
        /FRONTEND_URL=.*/,
        `FRONTEND_URL=${frontendUrl}`
      );
      fs.writeFileSync('backend/.env', updatedBackendEnv);
      console.log('✅ Updated backend CORS');
      
      console.log('🌍 Share this URL with your senior:', frontendUrl);
      console.log('🔄 Restart your Angular app to apply changes');
      
    } else {
      console.log('❌ Make sure both ngrok tunnels are running:');
      console.log('   ngrok http 4200  # Frontend');
      console.log('   ngrok http 3000  # Backend');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure ngrok is running for both ports');
  }
}

updateForNgrok();