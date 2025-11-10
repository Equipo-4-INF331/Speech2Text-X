pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        OPEN_API_KEY = credentials('OPEN_API_KEY')
        PORT = credentials('PORT')
        PGUSER = credentials('PGUSER')
        PGPASSWORD = credentials('PGPASSWORD')
        PGHOST = credentials('PGHOST')
        PGDATABASE = credentials('PGDATABASE')
        AWS_S3_BUCKET = credentials('AWS_S3_BUCKET')
        AWS_REGION = credentials('AWS_REGION')
        AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
        AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')


    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
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
                            sh 'npm ci --include=dev'
                            sh 'npm run test'
                        }
                    }
                }
                stage('Frontend tests') {
                    steps {
                        dir('front') {
                            sh 'npm ci --include=dev'
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
                    sh 'rsync -a front/dist/ /home/ubuntu/Speech2Text-X/front/dist/'
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('back') {
                sh '''
                # recrear symlink al .env del workspace padre (por si el checkout limpio lo borra)
                ln -sf ../.env .env

                # reinstalar por si cambió algo del back
                npm ci --omit=dev

                # refrescar proceso con entorno actualizado
                pm2 start index.js --name speech2text || true
                pm2 restart speech2text --update-env

                pm2 save
                '''
                }
                sh 'sudo systemctl reload nginx || true'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finalizado'
        }
        failure {
            slackSend(channel: '#deploy', color: 'danger', message: "❌ Falló *${env.JOB_NAME}* #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Ver logs>)")
        }
        success {
            slackSend(channel: '#deploy', color: 'good', message: "✅ Éxito en *${env.JOB_NAME}* #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Ver detalles>)")
        }
    }
}
