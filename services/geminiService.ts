
import { GoogleGenAI, Type } from "@google/genai";
import { SheetRow, Tariffs } from "../types";

// Fix: Always use named parameter with process.env.API_KEY directly as per guidelines
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Analyzes data using gemini-3-flash-preview for basic text tasks.
 */
export const analyzeDataWithGemini = async (
  data: SheetRow[],
  userQuery: string,
  tariffs?: Tariffs
): Promise<string> => {
  try {
    const ai = getAiClient();
    const dataString = JSON.stringify(data.slice(0, 150));
    
    const tariffsInfo = tariffs 
      ? Object.entries(tariffs).map(([k, v]) => `- ${k}: $${v}/hora`).join('\n')
      : "Tarifas estándar activas.";

    // Fix: Move system instructions and business rules to systemInstruction config for better results
    const systemInstruction = `
      Eres el Asistente Inteligente de un Estacionamiento Vehicular.
      Datos actuales del sistema: ${dataString}
      
      Tarifas configuradas actualmente:
      ${tariffsInfo}
      
      Reglas de negocio:
      - Si un vehículo no tiene hora de salida, está "Activo".
      - Las tarifas son por hora o fracción de hora.
      
      Responde de forma ejecutiva y amable. Si te piden cálculos de costos, usa la hora actual (${new Date().toLocaleString()}) si el vehículo sigue activo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Usuario pregunta: "${userQuery}"`,
      config: {
        systemInstruction
      }
    });

    // Fix: Access .text property directly (do not use text() method)
    return response.text || "No hay respuesta disponible.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Error al analizar datos del estacionamiento.";
  }
};

/**
 * Generates structured row data using gemini-3-pro-preview for complex reasoning and structured output.
 */
export const generateRowWithGemini = async (
  columns: string[],
  instruction: string,
  existingDataSample: SheetRow[]
): Promise<Record<string, string | number> | null> => {
  try {
    const ai = getAiClient();
    const properties: Record<string, any> = {};
    const colOrdering: string[] = [];

    columns.forEach(col => {
      if (col !== 'id') {
        properties[col] = { 
          type: Type.STRING,
          description: `Valor para la columna ${col}`
        };
        colOrdering.push(col);
      }
    });

    // Fix: Use systemInstruction for structure and persona
    const systemInstruction = `
      Eres un experto en extracción de datos estructurados para un sistema de estacionamiento.
      Debes generar un objeto JSON que represente un registro de ingreso o salida.
      Fecha/Hora de referencia: ${new Date().toLocaleString()}
      
      Reglas de generación:
      1. Si es un INGRESO: 'Entrada' = Hora actual, 'Salida' = '-', 'Estado' = 'Activo', 'Total' = 0.
      2. Si es una SALIDA: Busca el vehículo en el historial contextal si se provee, y completa los campos correspondientes.
    `;

    const prompt = `Instrucción del usuario: "${instruction}". Columnas requeridas: ${columns.join(', ')}`;

    // Use gemini-3-pro-preview for complex structured data tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: properties,
          propertyOrdering: colOrdering
        }
      }
    });

    // Fix: Follow JSON extraction pattern from guidelines
    const jsonStr = response.text?.trim();
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};
