import { createRoot } from 'react-dom/client'
import './index.css'  // <--- ESSA LINHA É OBRIGATÓRIA PARA O ESTILO FUNCIONAR
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)