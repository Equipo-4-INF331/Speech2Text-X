pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-jenkins',
                    url: 'https://github.com/Equipo-4-INF331/Speech2Text-X.git'
            }
        }
        
        stage('Debug environment') {
            steps {
        	sh '''
            	    echo "=== PATH ==="
            	    echo $PATH
            	    echo "=== Node version ==="
 	    	    node -v
            	    echo "=== NPM version ==="
            	    npm -v
            	    echo "=== NPX version ==="
            	    npx -v
        	'''
    	    }
	}

        stage('Backend setup') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Frontend build') {
            steps {
                dir('front') {
                    sh 'npm ci'
                    sh 'npx vite build'
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                # Reiniciar el backend
                pm2 restart all || pm2 start back/index.js --name speech2text
                sudo systemctl restart nginx
                '''
            }
        }
    }
}
