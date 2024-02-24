document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);

    try {
        const response = await fetch('/api/items', {
            method: 'POST', 
            body: formData
        });

        if (response.ok) {
            console.log('Item added/edited successfully');
        } else {
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
