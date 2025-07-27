// Script to run in browser console to clear invalid persona data
// This will help users who are stuck in the persona loop

function clearInvalidPersonas() {
  const keys = Object.keys(localStorage);
  const personaKeys = keys.filter(key => key.startsWith('persona_'));
  
  personaKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      
      // Check if persona is valid
      const isValid = !!(
        data &&
        data.location?.country &&
        data.location?.city &&
        data.demographics?.ageRange &&
        data.demographics?.educationLevel &&
        data.professional?.employmentStatus &&
        data.professional?.industry &&
        data.interests?.length > 0
      );
      
      if (!isValid) {
        console.log(`Removing invalid persona for key: ${key}`);
        localStorage.removeItem(key);
      } else {
        console.log(`Valid persona found for key: ${key}`);
      }
    } catch (error) {
      console.error(`Error parsing persona for key ${key}:`, error);
      localStorage.removeItem(key);
    }
  });
  
  console.log('Persona cleanup complete. Please refresh the page.');
}

// Run the function
clearInvalidPersonas();