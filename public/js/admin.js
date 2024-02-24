// Handle form submission for adding/editing items
document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Collect form data
    const formData = new FormData(e.target);

    try {
        // Send form data to backend endpoint for processing
        const response = await fetch('/api/items', {
            method: 'POST', // Adjust method based on whether it's an add or edit operation
            body: formData
        });

        if (response.ok) {
            // Item added/edited successfully, handle response
            console.log('Item added/edited successfully');
        } else {
            // Handle error response
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
