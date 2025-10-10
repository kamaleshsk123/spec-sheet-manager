const fs = require('fs');
const axios = require('axios');

async function updateNgrokUrls() {
  try {
    // Get ngrok tunnel info
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    const frontendTunnel = tunnels.find(t => t.config.addr === 'localhost:4200');
    const backendTunnel = tunnels.find(t => t.config.addr === 'localhost:3000');
    
    if (backendTunnel) {
      const backendUrl = backendTunnel.public_url;
      console.log(`🔧 Backend URL: ${backendUrl}`);
      
      // Update Angular environment
      const envContent = `export const environment = {
  production: false,
  apiUrl: '${backendUrl}/api'
};`;
      
      fs.writeFileSync('src/environments/environment.ts', envContent);
      console.log('✅ Updated Angular environment with ngrok backend URL');
      
      // Update backend CORS
      const backendEnv = fs.readFileSync('backend/.env', 'utf8');
      const updatedBackendEnv = backendEnv.replace(
        /FRONTEND_URL=.*/,
        `FRONTEND_URL=${frontendTunnel ? frontendTunnel.public_url : 'http://localhost:4200'}`
      );
      fs.writeFileSync('backend/.env', updatedBackendEnv);
      console.log('✅ Updated backend CORS settings');
    }
    
    if (frontendTunnel) {
      console.log(`🎨 Frontend URL: ${frontendTunnel.public_url}`);
      console.log('🌍 Share this URL with your senior!');
    }
    
  } catch (error) {
    console.error('❌ Error updating URLs:', error.message);
    console.log('💡 Make sure ngrok is running and try again');
  }
}

updateNgrokUrls();