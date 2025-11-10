pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'hotfix/jenkinsfile',  // usa la rama actual del SCM
                    credentialsId: 'github-jenkins',
                    url: 'https://github.com/Equipo-4-INF331/Speech2Text-X.git'
            }
        }

        stage('Install dependencies') {
            parallel {
                stage('Backend install') {
                    steps {
                        dir('back') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend install') {
                    steps {
                        dir('front') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Testing') {
            environment {
                NODE_ENV = 'development'
            }
            parallel {
                stage('Backend tests') {
                    steps {
                        dir('back') {
                            sh 'npm run test'
                        }
                    }
                }
                stage('Frontend tests') {
                    steps {
                        dir('front') {
                            sh 'npm run test'
                        }
                    }
                }
            }
        }

        stage('Frontend build') {
            steps {
                dir('front') {
                    sh 'npm run build'
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

    post {
        always {
            echo 'Pipeline finalizado.'
        }
        failure {
            echo 'Algo falló durante el pipeline. Revisar logs.'
        }
        success {
            echo 'Pipeline completado con éxito.'
        }
    }
}
