
import fs from 'fs'

export const server = {
    host: '0.0.0.0',
    port: 8081,
    strictPort: true,
    proxy: {
        '/public': {
            target: 'https://www.vaughnnugent.com/public',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/public/, ''),
            headers: {
                //Don't send cookies to the remote server
                'cookies': "",
                "pragma": "no-cache",
                "Connection": "keep-alive",
                "Cache-Control": "no-cache",
            },
        },
        '/api': {
            target: 'http://127.0.0.1:8089',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            headers: {
                "sec-fetch-mode": "cors",
                "referer": null,
                "origin": "https://127.0.0.1:8080",
                "Connection": "keep-alive",
            }
        }
    },
    https: {
        key: fs.readFileSync('F:\\downloads\\test.pem'),
        cert: fs.readFileSync('F:\\downloads\\cert.pem'),
    }
}