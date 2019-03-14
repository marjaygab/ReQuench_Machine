Swal.fire({
    title: 'Please wait..',
    allowOutsideClick: false,
    onBeforeOpen: () => {
        Swal.showLoading();
    },
    onOpen: () => {
        
    },
    onClose: () => {
    }
}).then((result) => {
});